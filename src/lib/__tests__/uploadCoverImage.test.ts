import { uploadCoverImage } from "../uploadCoverImage";

describe("uploadCoverImage", () => {
  const fetchSpy = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchSpy.mockReset();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function makeDataUri(text = "hello"): string {
    return "data:image/jpeg;base64," + Buffer.from(text).toString("base64");
  }

  it("returns null for empty/null/undefined input without hitting fetch", async () => {
    expect(await uploadCoverImage(null)).toBeNull();
    expect(await uploadCoverImage(undefined)).toBeNull();
    expect(await uploadCoverImage("")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("passes through hosted http(s) URLs without uploading", async () => {
    const url = "https://example.com/cover.jpg";
    expect(await uploadCoverImage(url)).toBe(url);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uploads a data: URI and returns the hosted URL", async () => {
    const hostedUrl =
      "https://supabase.example/storage/v1/object/public/comic-covers/abc.jpg";
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: hostedUrl }),
    });

    const result = await uploadCoverImage(makeDataUri());

    expect(result).toBe(hostedUrl);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchSpy.mock.calls[0];
    expect(endpoint).toBe("/api/comics/upload-cover");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
  });

  it("returns null when upload responds non-OK", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    expect(await uploadCoverImage(makeDataUri())).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network"));
    expect(await uploadCoverImage(makeDataUri())).toBeNull();
  });

  it("returns null when response body is missing url field", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await uploadCoverImage(makeDataUri())).toBeNull();
  });

  it("returns null for malformed data: URIs", async () => {
    expect(await uploadCoverImage("data:image/jpeg")).toBeNull();
    expect(await uploadCoverImage("data:,")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
