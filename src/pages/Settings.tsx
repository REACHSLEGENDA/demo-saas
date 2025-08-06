import React from 'react';
import { ProfileSettingsForm } from '@/components/settings/ProfileSettingsForm';
import { PasswordSettingsForm } from '@/components/settings/PasswordSettingsForm';

const Settings = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Configuración</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <ProfileSettingsForm />
        <PasswordSettingsForm />
      </div>
    </div>
  );
};

export default Settings;