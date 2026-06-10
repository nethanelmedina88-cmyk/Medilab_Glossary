/* SHLIFIM sound — tiny WebAudio tones (no asset files). Respects a mute setting. */
window.SLSound = (function(){
  var ctx=null, muted=false;
  try{ muted = JSON.parse(localStorage.getItem('ml-muted')||'false'); }catch(e){}
  function ac(){ if(!ctx){ var C=window.AudioContext||window.webkitAudioContext; if(C) ctx=new C(); } if(ctx&&ctx.state==='suspended'){ try{ctx.resume();}catch(e){} } return ctx; }
  function blip(freq,start,dur,type,vol){ var c=ac(); if(!c) return; var o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine'; o.frequency.value=freq; o.connect(g); g.connect(c.destination);
    var t=c.currentTime+start; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.16,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.start(t); o.stop(t+dur+0.03); }
  return {
    success:function(){ if(muted) return; blip(660,0,0.12,'sine',0.18); blip(880,0.1,0.15,'sine',0.18); blip(1320,0.2,0.2,'sine',0.12); },
    wrong:function(){ if(muted) return; blip(200,0,0.22,'sawtooth',0.13); blip(150,0.09,0.3,'sawtooth',0.11); },
    ding:function(){ if(muted) return; blip(880,0,0.13,'triangle',0.16); blip(1175,0.07,0.18,'triangle',0.12); },
    pop:function(){ if(muted) return; blip(523,0,0.08,'sine',0.14); blip(784,0.06,0.12,'sine',0.11); },
    fanfare:function(){ if(muted) return; [523,659,784,1046].forEach(function(f,i){ blip(f,i*0.1,0.22,'triangle',0.16); }); },
    setMuted:function(m){ muted=!!m; try{ localStorage.setItem('ml-muted', JSON.stringify(muted)); }catch(e){} },
    isMuted:function(){ return muted; }
  };
})();
