import { ArrowUpRight, Share, Trash2 } from 'lucide-react';
import { useNavigate, useRouteLoaderData } from 'react-router';
import { useCopyToClipboard } from 'usehooks-ts';
import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import { useToast } from '~/hooks/use-toast';
import { canShare, shareContent } from '~/lib/share';
import { ContactAvatar } from '../contacts/contact-avatar';
import { useContact, useDeleteContact } from '../contacts/contact-hooks';
import { SettingsViewHeader } from './ui/settings-view-header';

export function SingleContact({ contactId }: { contactId: string }) {
  const { origin } = useRouteLoaderData('root') as { origin: string };
  const [_, copyToClipboard] = useCopyToClipboard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const deleteContact = useDeleteContact();
  const contact = useContact(contactId);

  const profileUrl = `${origin}/${contact?.username}`;

  const handleDelete = async () => {
    try {
      await deleteContact(contactId);
      toast({
        title: 'Contact deleted',
        description: contact?.username,
      });
      navigate('/settings/contacts');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete contact',
        description: 'Please try again later or contact support',
      });
    }
  };

  const handleShare = async () => {
    if (canShare()) {
      const data = {
        title: `${contact.username}'s Boardwalk`,
        url: profileUrl,
      };
      await shareContent(data);
    } else {
      copyToClipboard(profileUrl)
        .then(() => {
          toast({
            title: 'Profile link copied to clipboard',
          });
        })
        .catch((error) => {
          console.error(error);
          toast({
            title: 'Failed to copy profile link',
          });
        });
    }
  };

  return (
    <>
      <SettingsViewHeader
        title=""
        navBack={{
          to: '/settings/contacts',
          transition: 'slideRight',
          applyTo: 'oldView',
        }}
      >
        <button
          type="button"
          onClick={handleShare}
          className="rounded-full p-2 hover:bg-muted"
        >
          <Share className="h-5 w-5" />
        </button>
      </SettingsViewHeader>

      <PageContent>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <ContactAvatar username={contact.username} size="lg" />
            <h2 className="text-center text-2xl">{contact.username}</h2>
          </div>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              Remove Contact
            </Button>
            <Button size="lg" className="w-fit">
              Send
              <ArrowUpRight className=" h-5 w-5" />
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
