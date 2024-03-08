export interface ProofData {
    proofId: string;
    amount: number;
    secret: string;
    C: string;
    userId: number;
}

export interface NWAEventContent {
    secret: string;
    commands: string[];
    relay?: string;
    lud16?: string;
}