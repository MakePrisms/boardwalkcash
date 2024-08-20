const nostrData = {
  names: {
    gudnuf: "c67cd3e1a83daa56cff16f635db2fdb9ed9619300298d4701a58e68e84098345",
    bob: "c35ff8c340449f0d68af1aec4844bb44a9c0b8c1dd4f4d4efbc65e12039a348a",
    // PrismGrow: "870251b35749f809292870bc88646015e776418a4526bcd40cd3777fe3942030",
    // PrismGrow: "b86918762b2019994732dcaab0e520611e1355ac8c4d29a4f6dfcc92269f0556"
  },
  relays: {
  //   "c67cd3e1a83daa56cff16f635db2fdb9ed9619300298d4701a58e68e84098345": ["wss://relay.snort.social", "wss://relay.damus.io", "wss://nostr.wine", "wss://nos.lol", "wss://eden.nostr.land", "wss://nostr.mutinywallet.com"],
  }
};

export default async function Nip05(req, res) {
  const requestedName = req.query.name;

  if (!requestedName) {
    return res.status(404).json({ error: "Name not found" });
  }

  // Convert the requested name to lowercase for the lookup
  const normalizedRequestedName = requestedName.toLowerCase();

  // Find the matching key in nostrData.names (case-insensitive)
  const matchingNameKey = Object.keys(nostrData.names).find(
    key => key.toLowerCase() === normalizedRequestedName
  );

  if (!matchingNameKey) {
    return res.status(404).json({ error: "Name not found" });
  }

  const publicKeyForName = nostrData.names[matchingNameKey];

  const responseObject = {
    names: {
      [matchingNameKey]: publicKeyForName
    }
  };

  // Optionally add relays if they exist for the given name
  if (nostrData.relays[publicKeyForName]) {
    responseObject.relays = {
      [publicKeyForName]: nostrData.relays[publicKeyForName]
    };
  }

  return res.status(200).json(responseObject);
}