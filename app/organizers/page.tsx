"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrganizersPage() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganizers() {
      try {
        const res = await fetch("/api/organizers");
        const data = await res.json();
        setOrganizers(data);
      } catch (err) {
        console.error("Failed to load organizers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrganizers();
  }, []);

  if (loading) return <p className="p-4">Loading organizers...</p>;

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Organizers</h1>
      {organizers.length === 0 && <p>No organizers registered yet.</p>}

      {organizers.map((org: any) => (
        <Link href={`/organizers/${org.organizerId}`} key={org.organizerId}>
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>{org.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <strong>Phone:</strong> {org.phone}
              </p>
              <p>
                <strong>Email:</strong> {org.email}
              </p>
              <p>
                <strong>Location:</strong> {org.location}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
