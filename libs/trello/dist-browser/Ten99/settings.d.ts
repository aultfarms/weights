export declare type Ten99SettingsCategory = {
    name: string;
    alwaysReport?: boolean;
};
export declare type Ten99SettingsPerson = {
    name: string;
    taxid: string;
    address: string;
    othernames: string[];
};
export declare type Ten99Settings = {
    categories: Ten99SettingsCategory[];
    people: Ten99SettingsPerson[];
};
export declare function importSettings({ rawpeople, rawcategories }: {
    rawpeople: any[];
    rawcategories: any[];
}): Ten99Settings;
