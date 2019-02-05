import { sequences } from 'cerebral';

const dimensions = () => ({width: window.innerWidth, height: window.innerHeight });

export default {
  dimensions() { return dimensions(); },
  orientation() {
    const d = dimensions();
    return (d.width > d.height ? 'landscape' : 'portrat');
  },
  init(sequencepath) {
    window.addEventListener('resize', () => this.context.get(sequences`sequencepath`)(dimensions()));
    // compute it the first time:
    this.context.get(sequences`${sequencepath}`)(dimensions());
  },
};

