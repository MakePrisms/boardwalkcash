interface WebLN {
    // Define the properties and methods of WebLN here
    enable: () => Promise<void>;
    sendPayment: (paymentRequest: string) => Promise<any>;
    // Add other properties and methods as needed
}

interface Window {
    webln: WebLN;
}

declare module 'light-bolt11-decoder';
