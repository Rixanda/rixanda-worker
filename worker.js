// Rixanda — payment webhook -> email delivery
// Receives the WayForPay "Service URL" callback, looks up the purchased
// product's file in products.json, and emails the buyer a download link.

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response('Bad request', { status: 400 });
    }

    // Only act on successful payments
    if (data.transactionStatus !== 'Approved') {
      return new Response('Ignored (not approved)', { status: 200 });
    }

    const buyerEmail = data.email;
    const purchasedName = (data.products && data.products[0] && data.products[0].name) || '';

    // Look up the matching product in the live site data
    let fileLinkPage = 'https://rixanda.github.io/rixanda-site/index.html';
    try {
      const res = await fetch('https://rixanda.github.io/rixanda-site/data/products.json');
      const json = await res.json();
      const match = (json.products || []).find(p => p.name === purchasedName);
      if (match) {
        fileLinkPage = `https://rixanda.github.io/rixanda-site/download.html?id=${match.id}`;
      }
    } catch (e) {
      // fall back to the default link above if this fails
    }

    // Send the email via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rixanda <onboarding@resend.dev>',
        to: buyerEmail,
        subject: `Your ${purchasedName} is ready`,
        html: `
          <p>Thank you for your purchase!</p>
          <p>Your file — <strong>${purchasedName}</strong> — is ready to download:</p>
          <p><a href="${fileLinkPage}">${fileLinkPage}</a></p>
          <p>Trouble downloading? Just reply to this email and we'll help.</p>
        `,
      }),
    });

    return new Response('OK', { status: 200 });
  },
};

