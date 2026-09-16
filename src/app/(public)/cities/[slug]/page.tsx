import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityPage } from "@/components/cities/CityPage";
import { buildCityPages, cityDefinitions, cityMetadata, findCity } from "@/product/cities/registry";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return cityDefinitions.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = findCity((await params).slug);
  if (!city) notFound();
  return cityMetadata(city);
}
export default async function Page({ params }: Props) {
  const city = findCity((await params).slug);
  if (!city) notFound();
  const model = buildCityPages().find((page) => page.city.slug === city.slug);
  if (!model) notFound();
  return <CityPage model={model} />;
}
