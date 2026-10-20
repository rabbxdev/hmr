
import {hmr,hot} from './dist/client.js';

hmr.showError(new Error("er"))

console.log(hot)
if (hot) {
  console.log("met")

  hot.accept((newModule) => {
    console.log('Module hot-swapped successfully');
  });

  hot.dispose((data) => {
    // Save transient state before module reload
    data.cursorPos = window.scrollY;
  });
  hot.on("custom",(da)=>{
    console.log(da,"dacus")
  })
  hmr.emit("home",{name:"home"})
} 

