"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Organizer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  locationLink?: string;
  aboutUs?: string;
}

interface Tournament {
  id: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: string;
}

export default function OrganizerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const orgRes = await fetch(`/api/organizers/${params.id}`);
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganizer(orgData);
        }

        const tourRes = await fetch(`/api/tournaments?createdBy=${params.id}`);
        if (tourRes.ok) {
          const tourData = await tourRes.json();
          setTournaments(tourData);
        }
      } catch (err) {
        console.error("Failed to load organizer details:", err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchData();
  }, [params.id]);

  if (loading) return <p className="p-4">Loading organizer...</p>;
  if (!organizer) return <p className="p-4">Organizer not found</p>;

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      {/* Organizer Info */}
      <Card>
        <CardHeader>
          <CardTitle>{organizer.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Phone:</strong> {organizer.phone}
          </p>
          <p>
            <strong>Email:</strong> {organizer.email}
          </p>
          <p>
            <strong>Location:</strong> {organizer.location}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              localStorage.removeItem(`organizerId`);
              router.push("/");
            }}
          >
            Sign Out
          </Button>
          {organizer.locationLink && (
            <p>
              <a
                href={organizer.locationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View Location
              </a>
            </p>
          )}
          {organizer.aboutUs && <p className="mt-2">{organizer.aboutUs}</p>}
        </CardContent>
      </Card>

      {/* Tournaments */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Tournaments by {organizer.name}
        </h2>
        {tournaments.length === 0 ? (
          <p>No tournaments created yet.</p>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) => (
              <Link href={`/tournaments/${t.id}`} key={t.id}>
                <Card className="cursor-pointer hover:shadow-lg transition">
                  <CardHeader>
                    <CardTitle>{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {t.description && <p>{t.description}</p>}
                    {t.location && (
                      <p>
                        <strong>Location:</strong> {t.location}
                      </p>
                    )}
                    {t.startDate && (
                      <p>
                        <strong>Start Date:</strong> {t.startDate}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
