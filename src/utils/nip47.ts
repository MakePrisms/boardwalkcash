import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { nip04 } from "nostr-tools";

export enum NIP47Method {
  pay_invoice = "pay_invoice",
}

export interface NIP47Request {
  method: NIP47Method;
  params: {};
}

export interface NIP47Response {
  result_type: NIP47Method;
  result: {} | null;
  // error: {} | null;
}

export const decryptEventContent = async (
  event: NDKEvent,
  nwa: any
): Promise<NIP47Request> => {
  const decrypted = await nip04.decrypt(
    nwa.nwaSecretKey,
    event.pubkey,
    event.content
  );

  const checkContent = (content: any): content is NIP47Request => {
    return content.method in NIP47Method && content.params;
  };

  if (decrypted) {
    const parsed = JSON.parse(decrypted);
    if (checkContent(parsed)) {
      return parsed;
    } else {
      throw new Error("Invalid NIP47 request");
    }
  } else {
    throw new Error("Failed to decrypt event content");
  }
};

export class NIP47Response extends NDKEvent {
  constructor(
    public readonly ndk: NDK,
    public readonly method: NIP47Method,
    public readonly params: any,
    public readonly error: string | null = null,
    public readonly requestEvent: NDKEvent
  ) {
    super(ndk);

    this.kind = 23195;

    this.tags = [["e", requestEvent.id]];

    this.created_at = Math.floor(Date.now() / 1000);

    this.requestEvent = requestEvent;
  }

  public buildResponse = async (nwaPrivKey: string) => {
    const content = JSON.stringify({
      result_type: this.method,
      result: this.params,
      error: this.error,
    });

    const encrypted = await this.encryptContent(
      nwaPrivKey,
      this.requestEvent.pubkey,
      content
    );

    this.content = encrypted;

    await this.sign(new NDKPrivateKeySigner(nwaPrivKey));
  };

  private encryptContent = async (
    nwaPrivKey: string,
    pubkey: string,
    content: any
  ) => {
    return await nip04.encrypt(nwaPrivKey, pubkey, content);
  };
}
