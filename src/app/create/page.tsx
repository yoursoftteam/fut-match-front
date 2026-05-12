import type { Metadata } from "next";
import CreateMatchWrapper from "./CreateMatchWrapper";

export const metadata: Metadata = {
  title: "Crear Partido | Parti2",
  description: "Crea partidos de fútbol, define lugar, horario, formato y comparte con tus amigos.",
};

export default function CreateMatch() {
  return <CreateMatchWrapper />;
}
