/* eslint-disable jsx-a11y/aria-role */
import { Avatar, Paper, Text } from '@mantine/core';
import { Comme } from 'next/font/google';
import { NextSeo } from 'next-seo';

import { PageTitle } from '../components/PageTitle';
import Layout from '../modules/Layout';
import { createGetServerSideProps } from '../server/common/createGetServerSideProps';

const comme = Comme({ subsets: ['latin'] });

export const getServerSideProps = createGetServerSideProps('user');

export default function CreditsPage() {
	return (
		<Layout>
			<NextSeo title="Credits" />
			<div className="grid gap-y-5">
				<PageTitle>Credits</PageTitle>
				<p
					className={`text-lg md:text-xl lg:text-2xl xl:text-3xl tracking-wide font-semibold ${comme.className} text-gray-800 ml-2`}
				>
					AlpiCode Software Company from ICT 401 Group 4
					<br />
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					<UserInfoAction
						avatar="/team/f-l.jpg"
						name="Iommi Mandela Fuentes"
						job="CEO | Lead Developer"
						role="Group Leader"
					/>
					<UserInfoAction
						avatar="/team/jp-m.jpg"
						name="John Patrick Comadizo"
						job="Sales & Marketing Manager"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/aa-m.jpg"
						name="Angel Reign Artiaga"
						job="Product Manager"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/dc-m.jpg"
						name="Daner Carlos"
						job="IT Manager"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/cb-m.jpg"
						name="Christian Belarmino"
						job="Office Manager"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/pb-m.jpg"
						name="Priscilla Isabel Bacsa"
						job="Content Writer"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/a-m.png"
						name="Joseph Christian Ares"
						job="Graphic Designer"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/ec-m.jpg"
						name="Eliah Coralyn Santos"
						job="QA Engineer"
						role="Member"
					/>
					<UserInfoAction
						avatar="/team/l-m.png"
						name="Luke Asoy"
						job="QA Engineer"
						role="Member"
					/>
				</div>
			</div>
		</Layout>
	);
}

interface UserInfoActionProps {
	avatar: string;
	name: string;
	job: string;
	role: string;
}

function UserInfoAction({ avatar, name, job, role }: UserInfoActionProps) {
	return (
		<Paper
			radius="lg"
			withBorder
			p="lg"
			sx={(theme) => ({
				backgroundColor: theme.white,
			})}
			shadow="lg"
		>
			<Avatar src={avatar} size={160} radius={120} mx="auto" />
			<Text
				ta="center"
				fz="xl"
				weight={500}
				mt="md"
				className={`whitespace-nowrap`}
			>
				<span className={comme.className}>{name}</span>
			</Text>
			<Text ta="center" c="dimmed" fz="lg">
				{job}
			</Text>
			<Text ta="center" c="dimmed" fz="sm">
				{role}
			</Text>
		</Paper>
	);
}
