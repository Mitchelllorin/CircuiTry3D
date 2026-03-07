/**
 * Play Store Screenshot Generator page.
 * Wraps public/generate-screenshots.html in a full-height iframe so the
 * canvas-based generator is accessible through the React router at /#/screenshots.
 */
export default function Screenshots() {
  return (
    <iframe
      src="/generate-screenshots.html"
      title="Play Store Screenshot Generator"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        border: "none",
        background: "#040c18",
      }}
      // Allow downloads triggered by the iframe's Blob URLs
      sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
    />
  );
}
