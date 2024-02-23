import React, { useState } from "react";
import { Button } from "flowbite-react";
import { ArrowUpRightIcon } from '@heroicons/react/20/solid'
import { SendModal } from "@/components/modals/SendModal";

const Send = ({ wallet }) => {
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setIsSendModalOpen(true)}
                className="bg-cyan-teal text-white border-cyan-teal hover:bg-cyan-teal-dark hover:border-none hover:outline-none"
            >
                <span className="text-lg">&nbsp;&nbsp;Send&nbsp;</span><ArrowUpRightIcon className="ms-2 h-5 w-5" />
            </Button>
            <SendModal isSendModalOpen={isSendModalOpen} setIsSendModalOpen={setIsSendModalOpen} wallet={wallet}/>
        </>
    );
};

export default Send;
