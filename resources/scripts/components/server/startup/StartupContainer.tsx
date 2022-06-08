import React, { useCallback, useEffect, useState } from 'react';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import tw from 'twin.macro';
import VariableBox from '@/components/server/startup/VariableBox';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import getServerStartup from '@/api/swr/getServerStartup';
import Spinner from '@/components/elements/Spinner';
import { ServerError } from '@/components/elements/ScreenBlock';
import { httpErrorToHuman } from '@/api/http';
import { ServerContext } from '@/state/server';
import { useDeepCompareEffect } from '@/plugins/useDeepCompareEffect';
import Select from '@/components/elements/Select';
import isEqual from 'react-fast-compare';
import Input from '@/components/elements/Input';
import setSelectedDockerImage from '@/api/server/setSelectedDockerImage';
import InputSpinner from '@/components/elements/InputSpinner';
import useFlash from '@/plugins/useFlash';

const StartupContainer = () => {
    const [ loading, setLoading ] = useState(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const variables = ServerContext.useStoreState(({ server }) => ({
        variables: server.data!.variables,
        invocation: server.data!.invocation,
        dockerImage: server.data!.dockerImage,
    }), isEqual);

    const { data, error, isValidating, mutate } = getServerStartup(uuid, {
        ...variables,
        dockerImages: [ variables.dockerImage ],
    });

    const setServerFromState = ServerContext.useStoreActions(actions => actions.server.setServerFromState);
    const isCustomImage = data && !data.dockerImages.map(v => v.toLowerCase()).includes(variables.dockerImage.toLowerCase());

    useEffect(() => {
        // Since we're passing in initial data this will not trigger on mount automatically. We
        // want to always fetch fresh information from the API however when we're loading the startup
        // information.
        mutate();
    }, []);

    useDeepCompareEffect(() => {
        if (!data) return;

        setServerFromState(s => ({
            ...s,
            invocation: data.invocation,
            variables: data.variables,
        }));
    }, [ data ]);

    const updateSelectedDockerImage = useCallback((v: React.ChangeEvent<HTMLSelectElement>) => {
        setLoading(true);
        clearFlashes('startup:image');

        const image = v.currentTarget.value;
        setSelectedDockerImage(uuid, image)
            .then(() => setServerFromState(s => ({ ...s, dockerImage: image })))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'startup:image', error });
            })
            .then(() => setLoading(false));
    }, [ uuid ]);

    return (
        !data ?
            (!error || (error && isValidating)) ?
                <Spinner centered size={Spinner.Size.LARGE}/>
                :
                <ServerError
                    title={'Oops!'}
                    message={httpErrorToHuman(error)}
                    onRetry={() => mutate()}
                />
            :
            <ServerContentBlock title={'啟動設定'} showFlashKey={'startup:image'}>
                <div css={tw`md:flex`}>
                    <TitledGreyBox title={'啟動指令'} css={tw`flex-1`}>
                        <div css={tw`px-1 py-2`}>
                            <p css={tw`font-mono bg-neutral-900 rounded py-2 px-4`}>
                                {data.invocation}
                            </p>
                        </div>
                    </TitledGreyBox>
                    <TitledGreyBox title={'環境版本'} css={tw`flex-1 lg:flex-none lg:w-1/3 mt-8 md:mt-0 md:ml-10`}>
                        {data.dockerImages.length > 1 && !isCustomImage ?
                            <>
                                <InputSpinner visible={loading}>
                                    <Select
                                        disabled={data.dockerImages.length < 2}
                                        onChange={updateSelectedDockerImage}
                                        defaultValue={variables.dockerImage}
                                    >
                                        {data.dockerImages.map(image => (
                                            <option key={image} value={image}>{image}</option>
                                        ))}
                                    </Select>
                                </InputSpinner>
                                <p css={tw`text-xs text-neutral-300 mt-2`}>
                                    這是一個高級功能，允許你選擇要在何時使用的Docker環境版本
                                    來運行此伺服器。
                                    例如要運行Python 3.10 就選擇 Python 3.10 選項。
                                </p>
                            </>
                            :
                            <>
                                <Input disabled readOnly value={variables.dockerImage}/>
                                {isCustomImage &&
                                <p css={tw`text-xs text-neutral-300 mt-2`}>
                                    此 {'server\'s'} 的Docker環境版本已由管理員手動設置，無法
                                    因此你無法進行任何更改。
                                </p>
                                }
                            </>
                        }
                    </TitledGreyBox>
                </div>
                <h3 css={tw`mt-8 mb-2 text-2xl`}>環境變數設定</h3>
                <div css={tw`grid gap-8 md:grid-cols-2`}>
                    {data.variables.map(variable => <VariableBox key={variable.envVariable} variable={variable}/>)}
                </div>
            </ServerContentBlock>
    );
};

export default StartupContainer;
