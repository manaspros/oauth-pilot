declare module "virtual:assets" {
  const assets: {
    prompts: Record<string, string>;
    fixtures: Record<string, Record<string, string>>;
    guides: unknown[];
  };
  export default assets;
}
