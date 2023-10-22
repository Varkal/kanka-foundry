import { getSetting, setSetting } from '../foundry/settings';

export default async function migrate(): Promise<void> {
    const permissionSetting = getSetting('automaticPermissions') as string;

    // Don't run the migration if the setting is already a valid value
    if (['never', 'initial', 'always'].includes(permissionSetting)) {
        return;
    }

    if (permissionSetting === 'false') {
        await setSetting('automaticPermissions', 'never');
    } else if (permissionSetting === 'true') {
        await setSetting('automaticPermissions', 'initial');
    } else {
        await setSetting('automaticPermissions', 'never');
    }
}
