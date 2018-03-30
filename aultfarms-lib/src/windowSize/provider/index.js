import { Provider } from 'cerebral';

const dimensions = () => ({width: window.innerWidth, height: window.innerHeight });

export default Provider({
  dimensions() { return dimensions(); },
  orientation() {
    const d = dimensions();
    return (d.width > d.height ? 'landscape' : 'portrat');
  },
  init(signalpath) {
    window.addEventListener('resize', () => this.context.controller.getSignal(signalpath)(dimensions()));
    // compute it the first time:
    this.context.controller.getSignal(signalpath)(dimensions());
  },
});

