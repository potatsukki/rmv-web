import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Local browser checks use API fixtures; no real account, payment, or database is touched.
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
<script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GcashPayment } from '/src/pages/payments/components/GcashPayment.tsx';
import { GcashVerificationQueue } from '/src/pages/payments/components/GcashVerificationQueue.tsx';
import '/src/index.css';
window.qc = new QueryClient({defaultOptions:{queries:{retry:false}}});
const root = createRoot(document.getElementById('root'));
window.mount = (queue, flaggedOnly = false) => root.render(React.createElement(QueryClientProvider,{client:window.qc},React.createElement(React.Fragment,null,queue
? React.createElement(GcashVerificationQueue,{payments:queue,flaggedOnly}) : React.createElement(GcashPayment,{target:{bookingId:'222222222222222222222222'}}),React.createElement(Toaster))));
window.mount();
</script></body></html>`;
const server = await createServer({ server: { host: '127.0.0.1', port: 5174, strictPort: true },
  plugins: [{ name: 'gcash-smoke-harness', configureServer(vite) {
    vite.middlewares.use('/__gcash_smoke', async (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml('/__gcash_smoke.html', html));
    });
  } }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: process.env.GCASH_BROWSER_CHANNEL || 'msedge' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  let submissions = 0; let decisions = 0; let rejectDuplicate = false;
  const duplicateMessage = 'This GCash reference number has already been used. Please check your payment details.';
  let context = { reference: 'RMV-APPT-101', amountRequired: 1250, paymentStatus: 'unpaid', bookingStatus: 'pending_payment',
    merchant: 'RMV Stainless Steel Fabrication and Construction Services',
    settings: { accountName: 'RMV', accountNumber: '09123456789' }, attempts: [] };
  const attempt = { _id: '444444444444444444444444', customerName: 'Test Customer', bookingReference: 'RMV-APPT-101',
    service: 'Kitchen Counter', method: 'gcash', amountRequired: 1250, amountPaid: 1250, referenceNumber: '1234567890123',
    paymentDate: '2026-01-02T02:00:00Z', createdAt: '2026-01-02T03:00:00Z', paymentStatus: 'pending_verification' };
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()); let data;
    if (url.pathname.endsWith('/csrf-token')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { csrfToken: 'browser-test-csrf' } }) });
      return;
    }
    if (url.pathname.endsWith('/gcash/context')) data = context;
    else if (url.pathname.endsWith('/gcash/submit')) {
      const body = route.request().postDataJSON();
      assert.equal(body.bookingId, '222222222222222222222222');
      assert.equal(body.amountPaid, 1250); assert.match(body.referenceNumber, /^\d{13}$/);
      assert.equal(body.paymentStatus, undefined); assert.equal(body.amountRequired, undefined);
      submissions++;
      if (rejectDuplicate) {
        rejectDuplicate = false;
        const rejected = { ...attempt, _id: 'duplicate-attempt', paymentStatus: 'rejected', duplicateReference: true,
          rejectionReason: 'Duplicate reference number', rejectionSource: 'system', rejectedBy: null, rejectedAt: '2026-01-02T04:00:00Z' };
        context = { ...context, paymentStatus: 'rejected', attempts: [rejected, ...context.attempts] };
        await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, error: { message: duplicateMessage } }) });
        return;
      }
      data = { ...attempt, _id: `submitted-${submissions}`, referenceNumber: body.referenceNumber };
      context = { ...context, paymentStatus: 'pending_verification', attempts: [data, ...context.attempts] };
    } else if (url.pathname.endsWith('/gcash/cash')) {
      assert.deepEqual(route.request().postDataJSON(), { bookingId: '222222222222222222222222' });
      context = { ...context, paymentStatus: 'unpaid', attempts: [{ ...attempt, method: 'cash', amountPaid: 0, paymentStatus: 'unpaid' }] };
      data = { paymentMethod: 'cash', paymentStatus: 'unpaid' };
    } else if (url.pathname.endsWith('/users/signature')) data = { signatureKey: 'signature.png' };
    else if (url.pathname.endsWith('/approve')) {
      assert.equal(route.request().postDataJSON().signatureKey, 'signature.png'); decisions++; data = { paymentStatus: 'paid' };
    } else if (url.pathname.endsWith('/reject')) {
      assert.equal(route.request().postDataJSON().reason, 'Payment not found'); decisions++; data = { paymentStatus: 'rejected' };
    } else throw new Error(`Unexpected API request: ${url.pathname}`);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.goto('http://127.0.0.1:5174/__gcash_smoke');
  await page.getByLabel('GCash Reference Number').waitFor();
  assert.equal(await page.locator('input[type=password]').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'Submit Payment for Verification' }).click(); assert.equal(submissions, 0);
  const fill = async (reference = '1234567890123') => {
    await page.getByLabel('GCash Reference Number').fill(reference);
    await page.getByLabel('Amount Paid', { exact: true }).fill('1250');
    await page.getByLabel('Payment Date', { exact: true }).fill('2026-01-02T10:00');
  };
  await fill(); await page.getByRole('button', { name: 'Submit Payment for Verification' }).click();
  await page.getByText('Your GCash payment has been submitted and is waiting for verification by the cashier.').waitFor();
  assert.equal(submissions, 1); assert.equal(await page.getByRole('button', { name: 'Approve Payment' }).count(), 0);
  context = { ...context, paymentStatus: 'rejected', attempts: [{ ...attempt, paymentStatus: 'rejected', declineReason: 'Incorrect amount' }] };
  await page.evaluate(() => window.qc.invalidateQueries({ queryKey: ['payments'] }));
  await page.getByText('Reason: Incorrect amount', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Submit Payment Again' }).click(); await fill(); rejectDuplicate = true;
  await page.getByRole('button', { name: 'Submit Payment for Verification' }).click();
  await page.getByText(duplicateMessage, { exact: true }).waitFor();
  await page.getByText('Duplicate reference number - flagged', { exact: true }).waitFor();
  assert.equal(context.bookingStatus, 'pending_payment'); assert.equal(context.attempts.length, 2);
  await fill('9876543210123');
  await page.getByRole('button', { name: 'Submit Payment for Verification' }).click();
  await page.getByText('Your GCash payment has been submitted and is waiting for verification by the cashier.').waitFor(); assert.equal(submissions, 3);
  assert.equal(context.attempts.length, 3);
  await page.getByText('GCash Reference Number: 9876543210123', { exact: true }).waitFor();
  context = { ...context, paymentStatus: 'paid', bookingStatus: 'confirmed', attempts: [{ ...attempt, paymentStatus: 'paid', verifiedAt: '2026-01-02T04:00:00Z', verifiedBy: { firstName: 'Test', lastName: 'Cashier' } }] };
  await page.evaluate(() => window.qc.invalidateQueries({ queryKey: ['payments'] })); await page.getByText(/Payment Approved/).waitFor();
  context = { ...context, paymentStatus: 'unpaid', bookingStatus: 'pending_payment', attempts: [] };
  await page.evaluate(() => window.qc.invalidateQueries({ queryKey: ['payments'] }));
  await page.getByRole('radio', { name: 'Cash / Pay On-site' }).check();
  await page.getByRole('button', { name: 'Choose Cash / Pay On-site' }).click();
  await page.getByText('Cash / Pay On-site selected. Payment Status: Unpaid.').waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate((row) => window.mount([row]), attempt);
  await page.getByRole('button', { name: 'View', exact: true }).click(); await page.getByRole('heading', { name: 'GCash Payment Details' }).waitFor();
  await page.getByRole('button', { name: 'Approve Payment', exact: true }).click();
  await page.getByText('Are you sure you want to approve this payment?').waitFor();
  await page.getByRole('button', { name: 'Approve Payment', exact: true }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).waitFor(); assert.equal(decisions, 1);
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Reject Payment', exact: true }).isDisabled(), true);
  assert.deepEqual(await page.locator('#gcash-rejection-reasons option').evaluateAll((options) => options.map((option) => option.value)),
    ['Invalid reference number', 'Duplicate reference number', 'Payment not found', 'Incorrect amount', 'Invalid proof of payment']);
  await page.getByLabel('Rejection Reason').fill('Payment not found');
  await page.getByRole('button', { name: 'Reject Payment', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).waitFor(); assert.equal(decisions, 2);
  await page.evaluate((row) => window.mount([row], true), { ...attempt, paymentStatus: 'rejected', duplicateReference: true,
    rejectionReason: 'Duplicate reference number', rejectionSource: 'system', rejectedAt: '2026-01-02T04:00:00Z', rejectedBy: null });
  await page.getByRole('heading', { name: 'Flagged GCash Payment History' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Reject', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await page.getByText('System validation', { exact: true }).waitFor();
  await page.getByText('Duplicate reference number - flagged and rejected.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve Payment', exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('GCash browser smoke passed: mobile form, validation, submission, pending, duplicate error and audit history, corrected resubmission, paid booking, unpaid cash, cashier view/confirmation/rejection reasons, flagged history. API fixtures only.');
} finally { await browser?.close(); await server.close(); }
