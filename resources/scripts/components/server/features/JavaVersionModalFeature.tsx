import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import Modal from '@/components/elements/Modal';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import setSelectedDockerImage from '@/api/server/setSelectedDockerImage';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import Select from '@/components/elements/Select';

const dockerImageList = [
    { name: 'Java 17', image: 'ghcr.io/pterodactyl/yolks:java_17' },
    { name: 'Java 16', image: 'ghcr.io/pterodactyl/yolks:java_16' },
    { name: 'Java 11', image: 'ghcr.io/pterodactyl/yolks:java_11' },
    { name: 'Java 8', image: 'ghcr.io/pterodactyl/yolks:java_8' },
];

const JavaVersionModalFeature = () => {
    const [ visible, setVisible ] = useState(false);
    const [ loading, setLoading ] = useState(false);
    const [ selectedVersion, setSelectedVersion ] = useState('ghcr.io/pterodactyl/yolks:java_17');

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const status = ServerContext.useStoreState(state => state.status.value);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const errors = [
            'minecraft 1.17 requires running the server with java 16 or above',
            'minecraft 1.18 requires running the server with java 17 or above',
            'java.lang.unsupportedclassversionerror',
            'unsupported major.minor version',
            'has been compiled by a more recent version of the java runtime',
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

    const updateJava = () => {
        setLoading(true);
        clearFlashes('feature:javaVersion');

        setSelectedDockerImage(uuid, selectedVersion)
            .then(() => {
                if (status === 'offline' && instance) {
                    instance.send(SocketRequest.SET_STATE, 'restart');
                }

                setLoading(false);
                setVisible(false);
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'feature:javaVersion', error });
            })
            .then(() => setLoading(false));
    };

    useEffect(() => {
        clearFlashes('feature:javaVersion');
    }, []);

    return (
        <Modal visible={visible} onDismissed={() => setVisible(false)} closeOnBackground={false} showSpinnerOverlay={loading}>
            <FlashMessageRender key={'feature:javaVersion'} css={tw`mb-4`}/>
            <h2 css={tw`text-2xl mb-4 text-neutral-100`}>Java 版本無效，更新 Docker 環境版本?</h2>
            <p css={tw`mt-4`}>由於未滿足所需的 Java 版本，此伺服器無法啟動。</p>
            <p css={tw`mt-4`}>通過按下下方的 {'"更新Docker環境版本"'}，以確認此伺服器使用的 Docker 環境版本將更改為下方你選擇的 Java 版本。</p>
            <div css={tw`sm:flex items-center mt-4`}>
                <p>請從下面的列表中選擇一個 Java 版本。</p>
                <Select
                    onChange={e => setSelectedVersion(e.target.value)}
                >
                    {dockerImageList.map((key, index) => {
                        return (
                            <option key={index} value={key.image}>{key.name}</option>
                        );
                    })}
                </Select>
            </div>
            <div css={tw`mt-8 sm:flex items-center justify-end`}>
                <Button isSecondary onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                        關閉
                </Button>
                <Button onClick={updateJava} css={tw`mt-4 sm:mt-0 sm:ml-4 w-full sm:w-auto`}>
                        更新Docker環境版本
                </Button>
            </div>
        </Modal>
    );
};

export default JavaVersionModalFeature;