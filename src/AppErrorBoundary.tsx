import React from 'react';

type State={error:Error|null};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren,State>{
  state:State={error:null};
  static getDerivedStateFromError(error:Error):State{return {error};}
  componentDidCatch(error:Error,info:React.ErrorInfo){console.error('ByggPlan field app render error',error,info);}
  render(){
    if(!this.state.error)return this.props.children;
    return <main className="centerState" style={{padding:'24px'}}>
      <strong>ByggPlan</strong>
      <p>Appen kunde inte visa projektet.</p>
      <pre style={{whiteSpace:'pre-wrap',textAlign:'left',maxWidth:'720px',overflowWrap:'anywhere'}}>{this.state.error.message}</pre>
      <button onClick={()=>window.location.reload()}>Ladda om</button>
    </main>;
  }
}
