import { PolicyContainer } from '~/components/PolicyContainer';

const PRIVACY_CONTENT = `UPDATED MAY 19, 2025
# Privacy Policy

## 1. Introduction and Overview

This Privacy Policy (the "Privacy Policy") provides a comprehensive description of how MakePrisms Inc. ("MakePrisms", "Agicash", "We," "our," or "us") collects, uses, and shares information about you in connection with your access to and use of the Services, not only through www.agi.cash and any applications developed by us (collectively, the "Site") but also through any external applications where the Services are embedded or utilized. The services offered by Agicash consist of a non-custodial wallet web application that runs entirely on your device or within a secure enclave server controlled solely by your device (the "Services"). We do not operate any servers that hold your funds or execute transactions on your behalf.

By using the Services, you agree to our Terms of Use (the "Terms") and understand that the Terms represent a binding agreement between you and us. By using the Services, you also agree to our collection, use, and disclosure practices, as well as any other activities described in this Privacy Policy. If you do not agree with the terms of this Privacy Policy, you should immediately discontinue the use of the Services and refrain from accessing the Site. If you have any questions or wish to exercise your rights and choices, please contact us at the email or portal address set forth in the "Contact Us" section below.

## 2. Changes to Privacy Policy

We reserve the right to revise and reissue this Privacy Policy at any time. Any changes will be effective immediately upon our posting of the revised Privacy Policy. For the avoidance of doubt, your continued use of the Services indicates your consent to the revised Privacy Policy then posted.

## 3. Information Collection

### A. Personal Data
While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to Email address, Username, Cookies, and Usage Data.

### B. Usage Data
We may also collect information that your browser sends whenever you visit our Services by or through your computer or mobile device ("Usage Data").

This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.

When you access the Service by or through a mobile device, this Usage Data may include information such as the type of mobile device you use, your mobile device unique ID, the IP address of your mobile device, your mobile operating system, the type of mobile Internet browser you use, unique device identifiers and other diagnostic data.

### C. Tracking Cookies Data
We use cookies and similar tracking technologies to track the activity on our Services and hold certain information.
Cookies are files with a small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from a website and stored on your device. Tracking technologies also used are beacons, tags, and scripts to collect and track information and to improve and analyze our Service.

You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.

## 4. Use of Information

We use information for business purposes in accordance with the practices described in this Privacy Policy. Our business purposes for collecting and using information include:

- Operating and managing the Services
- Performing services requested by you, such as responding to your comments, questions, and requests, and providing information support
- Sending you technical notices, updates, security alerts, information regarding changes to our policies, and support and administrative messages
- Detecting, preventing, and addressing fraud, breach of Terms, and threats, or harm
- Compliance with legal and regulatory requirements
- Protecting the security and integrity of the Services
- Improving the Services and other websites, apps, products and services
- Conducting promotions
- Fulfilling any other business purpose

Notwithstanding the above, we may use information that does not identify you (including information that has been aggregated or de-identified) for any purpose except as prohibited by applicable law.

## 5. Sharing and Disclosure of Information

If we share or disclose information that we collect, we do so in accordance with the practices described in this Privacy Policy. The categories of parties with whom we may share information include but are not limited to:

- Affiliates
- Service Providers
- Professional Advisors
- In connection with Merger or Acquisition
- For Security and Compelled Disclosure
- To Facilitate Requests
- With your Consent

Notwithstanding the above, we may share information that does not identify you (including information that has been aggregated or de-identified) except as prohibited by applicable law.

## 6. Other Parties

We may integrate technologies operated or controlled by other parties into parts of the Services or the Services may be integrated into technologies operated or controlled by other parties. Please note that when you interact with other parties those parties may independently collect information about you and solicit information from you. The information collected and stored by those parties remains subject to their own policies and practices, including what information they share with us, your rights and choices on their services and devices, and whether they store information in the U.S. or elsewhere. We encourage you to familiarize yourself with and consult their privacy policies and terms of use.

## 7. Data Security

We implement and maintain reasonable administrative, physical, and technical security safeguards to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. Nevertheless, transmission via the internet is not completely secure and we cannot guarantee the security of information about you.

## 8. International Transfer

Please be aware that information collected through the Services may be transferred to, processed, stored, and used in the United States and other jurisdictions. Data protection laws in the US and other jurisdictions may be different from those of your country of residence. Your use of the Services or provision of any information therefore constitutes your consent to the transfer to and from, processing, usage, sharing, and storage of information about you in the US and other jurisdictions as set out in this Privacy Policy.

## 9. Children

The Services are intended for general audiences and are not directed at children. To use the Services, you must legally be able to enter into the Agreement. We do not knowingly collect personal information (as defined by the U.S. Children's Privacy Protection Act, or "COPPA") from children.

## 10. Your Rights

Depending on your location, you may have certain rights under applicable privacy laws. These rights may include:

- Access – The right to know what personal information we hold about you
- Correction – The right to request that we correct inaccurate personal data
- Deletion – The right to request deletion of your personal data, subject to certain exceptions
- Objection or Restriction – The right to object to or restrict our use of your personal data in certain cases
- Portability – The right to request a portable copy of your data where applicable
- Withdraw Consent – Where we rely on your consent, the right to withdraw it at any time

To exercise these rights, you may contact us at contact@agi.cash. Please note that we may request additional information to verify your identity before fulfilling your request. We will respond in accordance with applicable laws.

We do not sell your personal information.

## 11. Contact Us

If you have any questions or comments about this Privacy Policy, our data practices, or our compliance with applicable law, please contact us:

By email: contact@agi.cash
By mail: MakePrisms, Inc. PO Box 934, Larkspur, CA 94977`;

export default function PrivacyPage() {
  return <PolicyContainer content={PRIVACY_CONTENT} />;
}
