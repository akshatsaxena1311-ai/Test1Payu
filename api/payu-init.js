// Vercel Serverless Function (Node 18+ runtime by default)
import crypto from "crypto";

const KEY  = process.env.PAYU_KEY;   // set in Vercel → Project Settings → Environment Variables
const SALT = process.env.PAYU_SALT;  // set in Vercel → Project Settings → Environment Variables

function toAmount2(a){ return Number(a).toFixed(2); }
function generateTxnId() {
  const base = crypto.randomBytes(16).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  return base.substring(0, 25);
}

// PayU v7 hash: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
function makeHash({ key, txnid, amount, productinfo, firstname, email, udf1="",udf2="",udf3="",udf4="",udf5="" }) {
  const seq = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${SALT}`;
  return crypto.createHash("sha512").update(seq).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { amount, productinfo="CRM Widget Product", firstname, email, surl, furl } = body;

    if (!KEY || !SALT) return res.status(500).json({ error: "Missing PAYU_KEY/PAYU_SALT env" });
    if (!amount || !firstname || !email) return res.status(400).json({ error: "Missing amount/firstname/email" });

    const txnid = generateTxnId();
    const payload = {
      key: KEY,
      txnid,
      amount: toAmount2(amount),
      productinfo,
      firstname,
      email
    };

    const hash = makeHash(payload);

    return res.status(200).json({
      ...payload,
      hash,
      api_version: "7",
      action: "https://test.payu.in/_payment",            // switch to https://secure.payu.in/_payment for prod
      surl: surl || "https://example.com/payu/success",    // override as you like
      furl: furl || "https://example.com/payu/failure"
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Init failed" });
  }
}
