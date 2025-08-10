import React from 'react';
import Settings from '../../components/Settings';

function SettingsView({
  currentView,
  selectedCollection,
  collections,
  onRenameCollection,
  onDeleteCollection,
  onClose,
  onStartTutorial,
  onSignOut,
}) {
  const currentTab =
    currentView === 'settings'
      ? 'general'
      : currentView.replace('settings-', '');

  return (
    <div className="pt-16">
      <Settings
        currentTab={currentTab}
        selectedCollection={selectedCollection}
        collections={collections}
        onStartTutorial={onStartTutorial}
        onSignOut={onSignOut}
        onClose={onClose}
        onRenameCollection={onRenameCollection}
        onDeleteCollection={onDeleteCollection}
      />
    </div>
  );
}

export default SettingsView;


