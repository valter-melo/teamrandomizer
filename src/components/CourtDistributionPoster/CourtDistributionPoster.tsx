import { forwardRef } from 'react';
import './CourtDistributionPoster.css';

export interface PosterTeamInfo {
  teamIndex: number;
  teamName: string;
  avgRating?: number;
  womenCount?: number;
}

export interface PosterCourtAllocation {
  name: string;
  teams: PosterTeamInfo[];
}

interface CourtDistributionPosterProps {
  courts: PosterCourtAllocation[];
  title?: string;
  subtitle?: string;
}

export const CourtDistributionPoster = forwardRef<
  HTMLDivElement,
  CourtDistributionPosterProps
>(({ courts, title = 'DISTRIBUIÇÃO DAS QUADRAS', subtitle = 'BORAVER' }, ref) => {
  return (
    <div className="court-poster" ref={ref}>
      <div className="court-poster-bg" />

      <header className="court-poster-header">
        <div className="court-poster-line" />
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      <img
        src="/images/boraver-logo-transparent.png"
        alt="Boraver"
        className="court-poster-logo"
      />

      <section className="court-poster-grid">
        {courts.map((court, index) => (
          <article className="court-card" key={`${court.name}-${index}`}>
            <div className="court-card-title">
              <span>{court.name}</span>
            </div>

            <div className="court-teams-list">
              {court.teams.length === 0 ? (
                <div className="empty-court">Nenhum time alocado</div>
              ) : (
                court.teams.map((team) => (
                  <div className="court-team-row" key={team.teamIndex}>
                    <div className="team-badge">
                      {team.teamIndex + 1}
                    </div>

                    <div className="team-info">
                      <strong>{team.teamName}</strong>

                      <span>
                        Média: {team.avgRating?.toFixed(1) ?? '-'} · Mulheres:{' '}
                        {team.womenCount ?? '-'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </section>

      <footer className="court-poster-footer">
        VÔLEI • TIMES • QUADRAS
      </footer>
    </div>
  );
});

CourtDistributionPoster.displayName = 'CourtDistributionPoster';