import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import Modal from '@/components/elements/Modal';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent } from '@/components/server/events';
import { useStoreState } from 'easy-peasy';

const SteamDiskSpaceFeature = () => {
    const [ visible, setVisible ] = useState(false);
    const [ loading ] = useState(false);

    const status = ServerContext.useStoreState(state => state.status.value);
    const { clearFlashes } = useFlash();
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);
    const isAdmin = useStoreState(state => state.user.data!.rootAdmin);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const errors = [
            'steamcmd needs 250mb of free disk space to update',
            '0x202 after update job',
        ];

        const listener = (line: string) => {
            if (errors.some(p => line.toLowerCase().includes(p))) {
                setVisible(true);
            }
        };

        instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

        return () => {
            instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
        };
    }, [ connected, instance, status ]);

    useEffect(() => {
        clearFlashes('feature:steamDiskSpace');
    }, []);

    return (
        <Modal visible={visible} onDismissed={() => setVisible(false)} closeOnBackground={false} showSpinnerOverlay={loading}>
            <FlashMessageRender key={'feature:steamDiskSpace'} css={tw`mb-4`} />
            {isAdmin ?
                <>
                    <div css={tw`mt-4 sm:flex items-center`}>
                        <h2 css={tw`text-2xl mb-4 text-neutral-100 `}>可用的儲存空間不足...</h2>
                    </div>
                    <p css={tw`mt-4`}>此伺服器的儲存空間已用盡，無法完成安裝或更新作業。</p>
                    <p css={tw`mt-4`}>通過更改配置確保此伺服器有足夠的儲存空間 <code css={tw`font-mono bg-neutral-900 rounded py-1 px-2`}>df -h</code> 在託管此伺服器的機器上。刪除檔案或增加可用儲存空間以解決此問題。</p>
                    <div css={tw`mt-8 sm:flex items-center justify-end`}>
                        <Button onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                            關閉
                        </Button>
                    </div>
                </>
                :
                <>
                    <div css={tw`mt-4 sm:flex items-center`}>
                        <h2 css={tw`text-2xl mb-4 text-neutral-100`}>可用的儲存空間不足...</h2>
                    </div>
                    <p css={tw`mt-4`}>此伺服器的儲存空間已用盡，無法完成安裝或更新過程。請與團隊成員聯繫並告知他們儲存空間問題。</p>
                    <div css={tw`mt-8 sm:flex items-center justify-end`}>
                        <Button onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                        關閉
                        </Button>
                    </div>
                </>
            }
        </Modal>
    );
};

export default SteamDiskSpaceFeature;