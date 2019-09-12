import { sequences } from 'cerebral';

const dimensions = () => ({width: window.innerWidth, height: window.innerHeight });

let seq = '';

const _M = {
  dimensions() { return dimensions(); },
  orientation() {
    const d = dimensions();
    return (d.width > d.height ? 'landscape' : 'portrait');
  },

  windowResized() { 
    this.context.get(sequences`${seq}`)(dimensions())
  },

  init(sequencepath) {
    seq = sequencepath;
    window.addEventListener('resize', _M.windowResized.bind(this));    // compute it the first time:
    this.context.get(sequences`${sequencepath}`)(dimensions());
  },

};

export default _M;
