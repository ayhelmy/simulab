// ── style objects ─────────────────────────────────────────────────────────────
import { CSSProperties } from 'react';

export  const heroWrapStyle: React.CSSProperties = {
  position:   'relative',
  minHeight:  380,
  display:    'flex',
  alignItems: 'center',
  overflow:   'hidden',
  padding:    '56px 5% 64px',
};

export const heroBgStyle: React.CSSProperties = {
  position:   'absolute',
  inset:      0,
  background: 'linear-gradient(135deg, #0A0F1E 0%, #0d1b3e 50%, #0f1e4a 100%)',
};

export const heroBgImgStyle: React.CSSProperties = {
  position:           'absolute',
  inset:              0,
  backgroundSize:     'cover',
  backgroundPosition: 'center',
  opacity:            0.08,
  filter:             'blur(24px) saturate(1.4)',
};

export const heroOverlayStyle: React.CSSProperties = {
  position:   'absolute',
  inset:      0,
  background: 'linear-gradient(90deg, rgba(10,15,30,.97) 40%, rgba(10,15,30,.3) 100%)',
};

export const heroGrainStyle: React.CSSProperties = {
  position:      'absolute',
  inset:         0,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
  backgroundSize: '180px',
  opacity:        0.45,
  pointerEvents:  'none',
};

export const heroContentStyle: React.CSSProperties = {
  position:   'relative',
  zIndex:     2,
  maxWidth:   600,
  flex:       1,
};

export const heroThumbStyle: React.CSSProperties = {
  position:     'relative',
  zIndex:       2,
  width:        320,
  height:       210,
  borderRadius: 16,
  overflow:     'hidden',
  flexShrink:   0,
  marginLeft:   40,
  border:       '1px solid rgba(255,255,255,.1)',
};

export const heroThumbShineStyle: React.CSSProperties = {
  position:   'absolute',
  inset:      0,
  background: 'linear-gradient(135deg, rgba(255,255,255,.08) 0%, transparent 60%)',
  pointerEvents: 'none',
};

export const backBtnStyle: React.CSSProperties = {
  display:      'inline-flex',
  alignItems:   'center',
  background:   'rgba(22, 22, 22, 0.47)',
  border:       '1px solid rgba(255,255,255,.12)',
  color:        'rgba(255,255,255,.7)',
  borderRadius: 8,
  padding:      '5px 12px',
  fontSize:     13,
  fontWeight:   500,
  cursor:       'pointer',
  marginBottom: 20,
  transition:   'all .15s',
};

export const heroBadgeStyle: React.CSSProperties = {
  display:      'inline-flex',
  alignItems:   'center',
  background:   'linear-gradient(90deg,#E07B15,#F59324)',
  color:        '#fff',
  fontSize:     11,
  fontWeight:   700,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding:      '4px 12px',
  borderRadius: 20,
  marginBottom: 14,
};

export const heroTitleStyle: React.CSSProperties = {
  color:        '#FFFFFF',
  fontSize:     'clamp(24px, 3.5vw, 40px)',
  fontWeight:   800,
  lineHeight:   1.2,
  margin:       '0 0 16px',
  letterSpacing: '-0.5px',
};

export const heroTagRowStyle: React.CSSProperties = {
  display:  'flex',
  flexWrap: 'wrap',
  gap:      8,
};

export const metaChipStyle: React.CSSProperties = {
  display:      'inline-flex',
  alignItems:   'center',
  background:   'rgba(17, 17, 17, 0.32)',
  color:        'rgba(255,255,255,.85)',
  fontSize:     12,
  fontWeight:   600,
  padding:      '5px 11px',
  borderRadius: 20,
  backdropFilter: 'blur(6px)',
  border:       '1px solid rgba(255,255,255,.08)',
};

export const heroPrimaryBtnStyle: React.CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  background:     'linear-gradient(135deg,#E07B15,#F59324)',
  color:          '#fff',
  border:         'none',
  borderRadius:   12,
  padding:        '13px 28px',
  fontSize:       15,
  fontWeight:     700,
  cursor:         'pointer',
  boxShadow:      '0 8px 30px rgba(245,147,36,.4)',
  transition:     'all .2s ease',
  letterSpacing:  '.01em',
};

export const ghostBtnStyle: React.CSSProperties = {
  background:   'rgba(255,255,255,.08)',
  border:       '1px solid rgba(255,255,255,.15)',
  color:        'rgba(255,255,255,.8)',
  borderRadius: 8,
  padding:      '8px 20px',
  fontSize:     14,
  cursor:       'pointer',
};

export const bodyGridStyle: React.CSSProperties = {
  // maxWidth:  1200,
  // margin:    '0 auto',
  padding:   '32px 5% 80px',
  display:   'flex',
  flexDirection: 'row',
  gap:       28,
  alignItems: 'flex-start',
  justifyContent: 'space-around',

};

export const sectionCardStyle: React.CSSProperties = {
  background:   '#fff',
  borderRadius: 16,
  border:       '1px solid #E5E7EB',
  padding:      '24px 28px',
  marginBottom: 20,
  boxShadow:    '0 1px 4px rgba(0,0,0,.04)',
  display:      'flex',
  flexDirection: 'column',
  width:       '40vw',
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize:    17,
  fontWeight:  700,
  color:       '#5C98B7',
  margin:      '0 0 16px',
  letterSpacing: '-.01em',
};

export const asideStyle: React.CSSProperties = {
  position:  'sticky',
  top:       88,
};

export const ctaCardStyle: React.CSSProperties = {
  background:   '#fff',
  border:       '1px solid #E5E7EB',
  borderRadius: 20,
  overflow:     'hidden',
  boxShadow:    '0 4px 24px rgba(0,0,0,.07)',
};

export const ctaThumbStyle: React.CSSProperties = {
  width:  '100%',
  height: 200,
  overflow: 'hidden',
};

export const ctaHeadStyle: React.CSSProperties = {
  fontSize:    16,
  fontWeight:  700,
  color:       '#5C98B7',
  margin:      '20px 20px 6px',
};

export const ctaSubStyle: React.CSSProperties = {
  fontSize:  13,
  color:     '#6B7280',
  lineHeight: 1.6,
  margin:    '0 20px 20px',
};

export const ctaPrimaryBtnStyle: React.CSSProperties = {
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  width:        'calc(100% - 40px)',
  margin:       '0 20px',
  background:   'linear-gradient(135deg,#E07B15,#F59324)',
  color:        '#fff',
  border:       'none',
  borderRadius: 12,
  padding:      '13px 0',
  fontSize:     14,
  fontWeight:   700,
  cursor:       'pointer',
  boxShadow:    '0 4px 18px rgba(245,147,36,.3)',
  transition:   'all .2s ease',
};

export const ctaSecondaryBtnStyle: React.CSSProperties = {
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  width:        'calc(100% - 40px)',
  margin:       '10px 20px 20px',
  background:   '#fff',
  color:        '#374151',
  border:       '1px solid #E5E7EB',
  borderRadius: 12,
  padding:      '11px 0',
  fontSize:     14,
  fontWeight:   600,
  cursor:       'pointer',
  transition:   'all .15s ease',
};
