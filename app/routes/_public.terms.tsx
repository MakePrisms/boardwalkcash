import { PolicyContainer } from '~/components/PolicyContainer';

const TERMS_CONTENT = `
UPDATED MAY 19, 2025

# Terms of Use

These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you" or "User(s)") and MakePrisms Inc., a Delaware corporation, ("MakePrisms", "Agicash", "we", "us", or "our"), concerning your access to and use of the Services, not only through www.agi.cash and any applications developed by MakePrisms Inc. (collectively, the "Website") but also through any external applications where the Services are embedded or utilized. 

The services offered by Agicash consist of a non-custodial wallet web application that runs entirely on your device or within a secure enclave server controlled solely by your device (the "Services"). We do not operate any servers that hold your funds or execute transactions on your behalf. You agree that by accessing the Services, you have read, understood, and agree to be bound by all of these Terms of Use. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF USE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.

[... rest of the terms ...]`;

export default function TermsPage() {
  return <PolicyContainer content={TERMS_CONTENT} />;
}
