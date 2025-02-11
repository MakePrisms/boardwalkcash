import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { isTestMint } from '~/lib/cashu/utils';

export default function ProtectedCashuDemo() {
  const [mintUrl, setMintUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testMintResult, setTestMintResult] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await isTestMint(mintUrl);
      setTestMintResult(result);
    } catch (error) {
      console.error('Failed to check mint:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mintUrl">Mint URL</Label>
          <Input
            id="mintUrl"
            type="text"
            value={mintUrl}
            onChange={(e) => setMintUrl(e.target.value)}
            placeholder="Enter mint URL"
            required
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Check Mint'}
        </Button>
      </form>

      {testMintResult !== null && (
        <div className="mt-4">
          <p>{testMintResult ? 'TEST MINT' : 'MAINNET MINT'}</p>
        </div>
      )}
    </div>
  );
}
