import { forwardRef } from 'react';
import './CourtPosterImage.css';

export interface TeamPlayer {
  id: string | number;
  name: string;
}

export interface PosterTeam {
  teamIndex: number;
  name: string;
  players: TeamPlayer[];
}

interface CourtPosterImageProps {
  courtName: string;
  teams: PosterTeam[];
}

export const CourtPosterImage = forwardRef<HTMLDivElement, CourtPosterImageProps>(
  ({ courtName, teams }, ref) => {
    const normalizedTeams = Array.from({ length: 4 }).map((_, index) => {
      return (
        teams[index] || {
          teamIndex: index,
          name: '',
          players: [],
        }
      );
    });

    return (
      <div className="court-image-poster" ref={ref}>
        <div className="court-image-bg" />

        <header className="court-image-header">
          <div className="court-image-line" />
          <h1>{courtName}</h1>
        </header>

        <img
          src="/images/boraver-logo-transparent.png"
          alt="Boraver"
          className="court-image-logo"
        />

        <section className="court-image-layout">
          {normalizedTeams.map((team, index) => (
            <article
              className={`team-poster-card team-slot-${index}`}
              key={`${team.teamIndex}-${index}`}
            >
              <div className="team-poster-title">
                <span>{team.name || `TIME ${index + 1}`}</span>
              </div>

              <div className="team-poster-players">
                {team.players.length > 0 ? (
                  team.players.map((player) => (
                    <div className="team-player-row" key={player.id}>
                      <div className="team-player-icon" />
                      <span className="team-player-name">{player.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="team-player-empty">Sem jogadores</div>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }
);

CourtPosterImage.displayName = 'CourtPosterImage';