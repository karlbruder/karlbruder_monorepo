import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithQuery } from "@/testing/render-with-query";
import { getSelection, getTags, saveSelection, saveTag, deleteTag, TagRequestError } from "@/features/tournament/api/tournament-tags";
import { RegistrationTags, StaffTagConfiguration } from "@/features/tournament/components/tournament-tags";

vi.mock("@/features/tournament/api/tournament-tags", async original => ({
  ...await original<typeof import("@/features/tournament/api/tournament-tags")>(),
  getTags: vi.fn(), getSelection: vi.fn(), saveSelection: vi.fn(), saveTag: vi.fn(), deleteTag: vi.fn(),
}));
const tag = { id: 3, tournament_id: 42, name: "Mystai", eligibility_description: "Primeira competição" };
const props = { token: "token", userId: "owner", tournamentId: 42, language: "pt" as const };
beforeEach(() => { vi.mocked(getTags).mockResolvedValue([tag]); vi.mocked(getSelection).mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("saves a participant's selected tags and displays the eligibility description", async () => {
  vi.mocked(saveSelection).mockResolvedValue([tag]);
  renderWithQuery(<RegistrationTags {...props} number="T42-1" />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Mystai Primeira competição/ }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar tags" }));
  await waitFor(() => expect(saveSelection).toHaveBeenCalledWith("token", 42, "T42-1", [3], false));
  expect(await screen.findByText("Tags salvas.")).toBeInTheDocument();
});

it("shows saved tags but disables participant editing after closure", async () => {
  vi.mocked(getSelection).mockResolvedValue([tag]);
  renderWithQuery(<RegistrationTags {...props} number="T42-1" closed />);
  expect(await screen.findByRole("checkbox", { name: /Mystai/ })).toBeDisabled();
  expect(screen.getByText(/não pode mais alterar/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Salvar tags" })).not.toBeInTheDocument();
});

it("explains a deletion conflict and keeps the tag visible", async () => {
  vi.mocked(deleteTag).mockRejectedValue(new TagRequestError(409));
  renderWithQuery(<StaffTagConfiguration {...props} />);
  await screen.findByText("Mystai");
  fireEvent.click(screen.getByRole("button", { name: "Excluir tag" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("em uso");
  expect(screen.getByText("Mystai")).toBeInTheDocument();
  expect(saveTag).not.toHaveBeenCalled();
});

it("hides athlete tags when the tournament has none", async () => {
  vi.mocked(getTags).mockResolvedValue([]);
  const { container } = renderWithQuery(<RegistrationTags {...props} number="T42-1" />);
  await waitFor(() => expect(getTags).toHaveBeenCalled());
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

it("keeps staff-entered descriptions unchanged in the English interface", async () => {
  renderWithQuery(<RegistrationTags {...props} number="T42-1" language="en" />);
  expect(await screen.findByText("Primeira competição")).toBeInTheDocument();
});

it("saves a staff tag change through the staff endpoint", async () => {
  vi.mocked(saveSelection).mockResolvedValue([tag]);
  renderWithQuery(<RegistrationTags {...props} number="T42-1" staff />);
  fireEvent.click(await screen.findByRole("checkbox", { name: /Mystai Primeira competição/ }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar tags" }));
  await waitFor(() => expect(saveSelection).toHaveBeenCalledWith("token", 42, "T42-1", [3], true));
  expect(await screen.findByText("Tags salvas.")).toBeInTheDocument();
});
