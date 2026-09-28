// Cloudflare Pages Function: forwards /__/auth/* and /__/firebase/* to Firebase's sign-in helper.
// This lets Google/Apple sign-in run on your own web address, which iPhones need
// for apps added to the Home Screen. You don't need to edit this file.
// (_routes.json makes sure this only runs for addresses starting with /__/ .)
import { FIREBASE_CONFIG } from "../assets/js/config.js";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/__/")) return context.next();
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.authDomain) {
    return new Response("Sign-in is not configured (FIREBASE_CONFIG is empty in assets/js/config.js).", { status: 404 });
  }
  const target = `https://${FIREBASE_CONFIG.authDomain}${url.pathname}${url.search}`;
  const init = { method: request.method, headers: request.headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = request.body;
  return fetch(target, init);
}
