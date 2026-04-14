// src/pages/ChampionshipsPage.tsx
import React from 'react';
import { ChampionshipList } from '../components/championship/ChampionshipList';

const ChampionshipsPage: React.FC = () => {
  return (
    <div>
      <h1>Campeonatos</h1>
      <ChampionshipList />
    </div>
  );
};

export default ChampionshipsPage;