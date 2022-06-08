import React, { useState } from 'react';
import {
    faBoxOpen,
    faCloudDownloadAlt,
    faEllipsisH,
    faLock,
    faTrashAlt,
    faUnlock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DropdownMenu, { DropdownButtonRow } from '@/components/elements/DropdownMenu';
import getBackupDownloadUrl from '@/api/server/backups/getBackupDownloadUrl';
import useFlash from '@/plugins/useFlash';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import deleteBackup from '@/api/server/backups/deleteBackup';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import Can from '@/components/elements/Can';
import tw from 'twin.macro';
import getServerBackups from '@/api/swr/getServerBackups';
import { ServerBackup } from '@/api/server/types';
import { ServerContext } from '@/state/server';
import Input from '@/components/elements/Input';
import { restoreServerBackup } from '@/api/server/backups';
import http, { httpErrorToHuman } from '@/api/http';

interface Props {
    backup: ServerBackup;
}

export default ({ backup }: Props) => {
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const setServerFromState = ServerContext.useStoreActions(actions => actions.server.setServerFromState);
    const [ modal, setModal ] = useState('');
    const [ loading, setLoading ] = useState(false);
    const [ truncate, setTruncate ] = useState(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { mutate } = getServerBackups();

    const doDownload = () => {
        setLoading(true);
        clearFlashes('backups');
        getBackupDownloadUrl(uuid, backup.uuid)
            .then(url => {
                // @ts-ignore
                window.location = url;
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'backups', error });
            })
            .then(() => setLoading(false));
    };

    const doDeletion = () => {
        setLoading(true);
        clearFlashes('backups');
        deleteBackup(uuid, backup.uuid)
            .then(() => mutate(data => ({
                ...data,
                items: data.items.filter(b => b.uuid !== backup.uuid),
                backupCount: data.backupCount - 1,
            }), false))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'backups', error });
                setLoading(false);
                setModal('');
            });
    };

    const doRestorationAction = () => {
        setLoading(true);
        clearFlashes('backups');
        restoreServerBackup(uuid, backup.uuid, truncate)
            .then(() => setServerFromState(s => ({
                ...s,
                status: 'restoring_backup',
            })))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'backups', error });
            })
            .then(() => setLoading(false))
            .then(() => setModal(''));
    };

    const onLockToggle = () => {
        if (backup.isLocked && modal !== 'unlock') {
            return setModal('unlock');
        }

        http.post(`/api/client/servers/${uuid}/backups/${backup.uuid}/lock`)
            .then(() => mutate(data => ({
                ...data,
                items: data.items.map(b => b.uuid !== backup.uuid ? b : {
                    ...b,
                    isLocked: !b.isLocked,
                }),
            }), false))
            .catch(error => alert(httpErrorToHuman(error)))
            .then(() => setModal(''));
    };

    return (
        <>
            <ConfirmationModal
                visible={modal === 'unlock'}
                title={'Unlock this backup?'}
                onConfirmed={onLockToggle}
                onModalDismissed={() => setModal('')}
                buttonText={'Yes, unlock'}
            >
                你確定要解鎖此備份嗎? 它將不再受到意外刪除保護。
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal === 'restore'}
                title={'Restore this backup?'}
                buttonText={'Restore backup'}
                onConfirmed={() => doRestorationAction()}
                onModalDismissed={() => setModal('')}
            >
                <p css={tw`text-neutral-300`}>
                    系統會強制關閉你的伺服器，並且從這個備份中將檔案還原回去你的伺服器
                </p>
                <p css={tw`text-neutral-300 mt-4`}>
                    你確定要繼續嗎?
                </p>
                <p css={tw`mt-4 -mb-2 bg-neutral-900 p-3 rounded`}>
                    <label
                        htmlFor={'restore_truncate'}
                        css={tw`text-base text-neutral-200 flex items-center cursor-pointer`}
                    >
                        <Input
                            type={'checkbox'}
                            css={tw`text-red-500! w-5! h-5! mr-2`}
                            id={'restore_truncate'}
                            value={'true'}
                            checked={truncate}
                            onChange={() => setTruncate(s => !s)}
                        />
                        在還原備份前刪除現有的所有檔案
                    </label>
                </p>
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal === 'delete'}
                title={'要刪除此備份?'}
                buttonText={'確定刪除'}
                onConfirmed={() => doDeletion()}
                onModalDismissed={() => setModal('')}
            >
                你確定要刪除此備份嗎? 這是永久性的操作，備份不能在
                刪除後恢復。
            </ConfirmationModal>
            <SpinnerOverlay visible={loading} fixed/>
            {backup.isSuccessful ?
                <DropdownMenu
                    renderToggle={onClick => (
                        <button
                            onClick={onClick}
                            css={tw`text-neutral-200 transition-colors duration-150 hover:text-neutral-100 p-2`}
                        >
                            <FontAwesomeIcon icon={faEllipsisH}/>
                        </button>
                    )}
                >
                    <div css={tw`text-sm`}>
                        <Can action={'backup.download'}>
                            <DropdownButtonRow onClick={doDownload}>
                                <FontAwesomeIcon fixedWidth icon={faCloudDownloadAlt} css={tw`text-xs`}/>
                                <span css={tw`ml-2`}>下載備份</span>
                            </DropdownButtonRow>
                        </Can>
                        <Can action={'backup.restore'}>
                            <DropdownButtonRow onClick={() => setModal('restore')}>
                                <FontAwesomeIcon fixedWidth icon={faBoxOpen} css={tw`text-xs`}/>
                                <span css={tw`ml-2`}>恢復備份</span>
                            </DropdownButtonRow>
                        </Can>
                        <Can action={'backup.delete'}>
                            <>
                                <DropdownButtonRow onClick={onLockToggle}>
                                    <FontAwesomeIcon
                                        fixedWidth
                                        icon={backup.isLocked ? faUnlock : faLock}
                                        css={tw`text-xs mr-2`}
                                    />
                                    {backup.isLocked ? '解鎖備份' : '上鎖備份'}
                                </DropdownButtonRow>
                                {!backup.isLocked &&
                                <DropdownButtonRow danger onClick={() => setModal('delete')}>
                                    <FontAwesomeIcon fixedWidth icon={faTrashAlt} css={tw`text-xs`}/>
                                    <span css={tw`ml-2`}>刪除備份</span>
                                </DropdownButtonRow>
                                }
                            </>
                        </Can>
                    </div>
                </DropdownMenu>
                :
                <button
                    onClick={() => setModal('delete')}
                    css={tw`text-neutral-200 transition-colors duration-150 hover:text-neutral-100 p-2`}
                >
                    <FontAwesomeIcon icon={faTrashAlt}/>
                </button>
            }
        </>
    );
};