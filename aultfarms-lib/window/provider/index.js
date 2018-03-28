var _this = this;

import { Provider } from 'cerebral';

const dimensions = () => ({ width: window.innerWidth, height: window.innerHeight });

export default Provider({
  dimensions,
  orientation: () => {
    const d = dimensions();
    return d.width > d.height ? 'landscape' : 'portrat';
  },
  init: signalname => {
    window.addEventListener('resize', () => _this.context.controller.getSignal(signalpath)(dimensions()));
  }
});
//# sourceMappingURL=index.js.map