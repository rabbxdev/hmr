import './src/client.ts';

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log('Module hot-swapped successfully');
  });

  import.meta.hot.dispose((data) => {
    // Save transient state before module reload
    data.cursorPos = window.scrollY;
  });
}
