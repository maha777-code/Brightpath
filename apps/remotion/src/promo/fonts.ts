import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

export const PROMO_FONT = 'MindVaultInter';

if (typeof FontFace !== 'undefined') {
  const handle = delayRender('Loading Inter for the promo');
  const face = new FontFace(PROMO_FONT, `url('${staticFile('fonts/InterVariable.woff2')}') format('woff2')`, {
    weight: '100 900',
  });
  face
    .load()
    .then(() => {
      document.fonts.add(face);
      continueRender(handle);
    })
    .catch((err) => cancelRender(err));
}
