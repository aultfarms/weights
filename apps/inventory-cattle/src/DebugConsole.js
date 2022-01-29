import React, { useState, useEffect } from 'react'
import { Console, Hook, Unhook } from 'console-feed'
 
export function DebugConsole() {
  const [logs, setLogs] = useState([]);
 
  // run once!
  useEffect(() => {
    if (!window.location.href.match(/debug/)) return; // only runs if ?debug=1
    Hook(window.console, log => setLogs(currLogs => currLogs ? [...currLogs, log] : []), false)
    console.log('Using console-feed because debug=1');
    return () => Unhook(window.console)
  }, [])

  if (!window.location.href.match(/debug/)) return <></>; // only runs if ?debug=1
  return <div style={{ backgroundColor: '#242424' }}>
    <Console logs={logs} variant="dark" />
  </div>;
}
