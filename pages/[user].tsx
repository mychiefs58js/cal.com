import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import prisma, { whereAndSelect } from "@lib/prisma";
import Avatar from "../components/Avatar";
import Theme from "@components/Theme";
import { ClockIcon, InformationCircleIcon, UserIcon } from "@heroicons/react/solid";
import React from "react";

export default function User(props): User {
  const { isReady } = Theme(props.user.theme);

  const eventTypes = props.eventTypes.map((type) => (
    <div
      key={type.id}
      className="dark:bg-gray-800 dark:opacity-90 dark:hover:opacity-100 dark:hover:bg-gray-800 bg-white hover:bg-gray-50 border border-neutral-200 hover:border-black rounded-sm">
      <Link href={`/${props.user.username}/${type.slug}`}>
        <a className="block px-6 py-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">{type.title}</h2>
          <div className="mt-2 flex space-x-4">
            <div className="flex items-center text-sm text-neutral-500">
              <ClockIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400" aria-hidden="true" />
              <p>{type.length}m</p>
            </div>
            <div className="flex items-center text-sm text-neutral-500">
              <UserIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400" aria-hidden="true" />
              <p>1-on-1</p>
            </div>
            <div className="flex items-center text-sm text-neutral-500">
              <InformationCircleIcon
                className="flex-shrink-0 mr-1.5 h-5 w-5 text-neutral-400"
                aria-hidden="true"
              />
              <p>{type.description.substring(0, 100)}</p>
            </div>
          </div>
        </a>
      </Link>
    </div>
  ));
  return (
    isReady && (
      <div className="bg-neutral-50 h-screen">
        <Head>
          <title>{props.user.name || props.user.username} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-3xl mx-auto py-24">
          <div className="mb-8 text-center">
            <Avatar user={props.user} className="mx-auto w-24 h-24 rounded-full mb-4" />
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
              {props.user.name || props.user.username}
            </h1>
            <p className="text-neutral-500 dark:text-white">{props.user.bio}</p>
          </div>
          <div className="space-y-4">{eventTypes}</div>
          {eventTypes.length == 0 && (
            <div className="shadow overflow-hidden rounded-sm">
              <div className="p-8 text-center text-gray-400 dark:text-white">
                <h2 className="font-semibold text-3xl text-gray-600">Uh oh!</h2>
                <p className="max-w-md mx-auto">This user hasn&apos;t set up any event types yet.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await whereAndSelect(
    prisma.user.findFirst,
    {
      username: context.query.user.toLowerCase(),
    },
    ["id", "username", "email", "name", "bio", "avatar", "theme"]
  );
  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user.id,
      hidden: false,
    },
    select: {
      slug: true,
      title: true,
      length: true,
      description: true,
    },
  });

  return {
    props: {
      user,
      eventTypes,
    },
  };
};

// Auxiliary methods
export function getRandomColorCode(): string {
  let color = "#";
  for (let idx = 0; idx < 6; idx++) {
    color += Math.floor(Math.random() * 10);
  }
  return color;
}
