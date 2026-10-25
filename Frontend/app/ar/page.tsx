import { permanentRedirect } from 'next/navigation';

// The Arabic home page moved to the site root (Arabic is the default
// language); keep old /ar links and search results working.
export default function ArabicHomeRedirect() {
  permanentRedirect('/');
}
