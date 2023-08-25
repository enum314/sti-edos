import { Button, Image } from '@mantine/core';
import { IconBrandOffice } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { NextSeo } from 'next-seo';

import { createGetServerSideProps } from '../../server/common/createGetServerSideProps';

export const getServerSideProps = createGetServerSideProps('guestOnly');

export default function Login() {
	return (
		<>
			<NextSeo title={`Login to STI eDOS`} />
			<div className="select-none grid place-items-center min-h-screen bg-gradient-to-tr from-cyan-500 to-blue-500 font-sans">
				<div className="w-full grid place-items-center gap-y-5 -mt-10">
					<h1 className="text-3xl text-white">Login to Continue</h1>
					<div className="bg-white w-full sm:w-1/3 sm:rounded-xl p-5 grid grid-cols-1 shadow-xl">
						<div className="select-none">
							<Image
								className="mx-auto"
								src="/icon-512x512.png"
								alt={'STI eDOS'}
								height={216}
								width={216}
							/>
						</div>
						<div>
							<Button
								fullWidth
								leftIcon={<IconBrandOffice />}
								onClick={() => signIn('azure-ad')}
								color="red"
							>
								Login with Office 365
							</Button>
						</div>
					</div>
					<h2 className="text-md text-gray-100 px-5">
						Copyright &copy; 2023 AlpiCode - ICT 401 Group 4
					</h2>
				</div>
			</div>
		</>
	);
}
