import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { GamifiedActivityInsights } from '@brightpath/shared';
import { GameArcade } from '@/components/games/arcade/GameArcade';
import type { ArcadeExportPack } from '@/components/games/arcade/arcadeExport';
import './standalone.css';

const NO_INSIGHTS: GamifiedActivityInsights = { keyTerms: [], learningObjectives: [], misconceptions: [] };

function readPack(): ArcadeExportPack | null {
  try {
    const pack = JSON.parse(document.getElementById('arcade-pack')?.textContent ?? '') as ArcadeExportPack;
    return pack?.document?.questions?.length ? pack : null;
  } catch {
    return null;
  }
}

function OfflineArcade({ pack }: { pack: ArcadeExportPack | null }) {
  if (!pack) {
    return (
      <main className="arcade-export">
        <p className="arcade-export__empty">
          This is the blank Game Arcade template. Download a game from MindVault to get a playable file.
        </p>
      </main>
    );
  }
  const { document: doc } = pack;
  return (
    <main className="arcade-export">
      <header className="arcade-export__head">
        <p className="mv-pres-muted text-xs uppercase tracking-wider">
          {[doc.subject, doc.gradeLabel].filter(Boolean).join(' · ')}
        </p>
        <h1 className="arcade-export__title">{doc.title}</h1>
      </header>
      <GameArcade document={doc} insights={NO_INSIGHTS} initialGameId={pack.gameId} lockGame studentMode />
      <footer className="arcade-export__foot mv-pres-muted">Made with MindVault Game Arcade · works offline</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="mv-presentation">
      <OfflineArcade pack={readPack()} />
    </div>
  </StrictMode>,
);
