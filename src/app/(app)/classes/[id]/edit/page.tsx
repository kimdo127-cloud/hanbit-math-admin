"use client";
import { useParams } from "next/navigation";
import { ClassForm } from "@/components/class-form";

export default function EditClassPage() {
  return <ClassForm id={Number(useParams().id)} />;
}
