// Quick contact form on contact.html — posts to Web3Forms (api.web3forms.com)
// since this is a static GitHub Pages site with no backend of its own.
// See https://web3forms.com/ for dashboard/access-key setup.
(function () {
  const form = document.getElementById('quickContactForm');
  if (!form) return;

  const submitBtn = document.getElementById('qc-submit');
  const status = document.getElementById('qc-status');
  const callback = document.getElementById('qc-callback');
  const phoneField = document.getElementById('qc-phone-field');
  const phoneInput = document.getElementById('qc-phone');
  const emailInput = document.getElementById('qc-email');
  const replyTo = document.getElementById('qc-replyto');

  const ENDPOINT = 'https://api.web3forms.com/submit';

  function syncCallbackMode() {
    const wantsCallback = callback.checked;
    phoneInput.required = wantsCallback;
    phoneInput.setAttribute('aria-required', String(wantsCallback));
    phoneField.querySelector('label').innerHTML = wantsCallback
      ? 'Phone'
      : 'Phone <span class="field-optional">(optional)</span>';
    submitBtn.textContent = wantsCallback ? 'Request callback' : 'Send message';
  }
  if (callback) {
    callback.addEventListener('change', syncCallbackMode);
    syncCallbackMode();
  }

  function setStatus(kind, html) {
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
    status.innerHTML = html;
  }

  function setSending(isSending) {
    submitBtn.disabled = isSending;
    submitBtn.textContent = isSending
      ? 'Sending…'
      : (callback.checked ? 'Request callback' : 'Send message');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    replyTo.value = emailInput.value.trim();

    setStatus('sending', 'Sending…');
    setSending(true);

    const fields = form.elements;
    const payload = {
      access_key: fields['access_key'].value,
      subject: fields['subject'].value,
      from_name: fields['from_name'].value,
      replyto: replyTo.value,
      name: fields['name'].value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      message: fields['message'].value.trim(),
      wants_callback: callback.checked ? 'Yes — please call back' : 'No — message only',
      botcheck: fields['botcheck'].checked
    };

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data && result.data.success) {
          form.hidden = true;
          setStatus('success', 'Thanks — your message is on its way. We typically reply within two business days.');
          status.hidden = false;
        } else {
          throw new Error((result.data && result.data.message) || 'Submission failed');
        }
      })
      .catch(function () {
        setStatus(
          'error',
          'Something went wrong sending this. Please email us directly at ' +
            '<a href="mailto:hello@rootsquare.io?subject=AI%20project%20inquiry">hello@rootsquare.io</a> instead.'
        );
        setSending(false);
      });
  });
})();
