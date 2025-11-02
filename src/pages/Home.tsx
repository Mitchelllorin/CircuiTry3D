export default function Home() {
  return (
    <div className="home-page">
      <iframe
        title="CircuiTry3D Landing"
        src="landing.html"
        style={{ width: "100%", height: "100%", border: 0 }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
