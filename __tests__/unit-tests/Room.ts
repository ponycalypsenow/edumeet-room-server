import 'jest';
import MediaService from '../../src/MediaService';
import Room from '../../src/Room';
import { Router } from '../../src/media/Router';
import LoadBalancer from '../../src/LoadBalancer';
import { Config } from '../../src/Config';
import { KDTree } from 'edumeet-common';
import { ActiveSpeakerObserver } from '../../src/media/ActiveSpeakerObserver';
import MediaNode from '../../src/media/MediaNode';
import { setTimeout } from 'timers/promises';

describe('Room', () => {
	let room1: Room;
	let spyEmit: jest.SpyInstance;
	const roomId1 = 'testRoom1';
	const roomName1 = 'testRoomName1';
	const config = { mediaNodes: [] } as unknown as Config;
	const loadBalancer = {} as unknown as LoadBalancer;	
	const mediaNode = {
		id: 'mediaNodeId',
		close: jest.fn(),
		once: jest.fn()
	} as unknown as MediaNode;

	beforeEach(() => {
		const kdTree = { rebalance: jest.fn() } as unknown as KDTree;
		const mediaService = MediaService.create(loadBalancer, kdTree, config);

		room1 = new Room({
			id: roomId1,
			tenantId: 'testTenantId',
			mediaService,
			name: roomName1,
		});

		spyEmit = jest.spyOn(room1, 'emit');
	});

	it('Has correct properties', () => {
		expect(room1).toBeInstanceOf(Room);
		expect(room1.id).toBe(roomId1);
		expect(room1.name).toBe(roomName1);
		expect(room1.sessionId).toBeDefined();
		expect(room1.closed).toBe(false);
		expect(room1.locked).toBe(true);

		expect(room1.routers.length).toBe(0);
		expect(room1.breakoutRooms.size).toBe(0);
		expect(room1.pendingPeers.length).toBe(0);
		expect(room1.peers.length).toBe(0);
		expect(room1.lobbyPeers.length).toBe(0);
	});

	it('close()', () => {
		room1.close();
		expect(room1.closed).toBe(true);
		expect(spyEmit).toHaveBeenCalledTimes(1);
	});

	describe('Router', () => {
		let router: Router;
		let spyClose: jest.SpyInstance;
		let spyAdd: jest.SpyInstance;

		beforeEach(() => {
			router = {
				mediaNode: {
					id: mediaNode.id 
				} as unknown as MediaNode,
				id: 'routerId',
				rtpCapabilities: jest.fn(),
				appData: {},
				close: jest.fn(),
				createActiveSpeakerObserver: jest.fn().mockResolvedValue(
					new ActiveSpeakerObserver(
						{ id: 'id',
							router,
							mediaNode }))
			} as unknown as Router;
			spyClose = jest.spyOn(router, 'close');
			spyAdd = jest.spyOn(room1.routers, 'add');
		});

		it('close() - should close router', async () => {
			room1.addRouter(router);
			room1.close();
			expect(spyClose).not.toHaveBeenCalled();
			await setTimeout(50);
			expect(spyClose).toHaveBeenCalled();
		});

		it('addRouter() - should have one router', () => {
			expect(room1.routers.length).toBe(0);
			room1.addRouter(router);
			expect(room1.routers.length).toBe(1);
			expect(spyAdd).toHaveBeenCalled();
		});
		
		it('addRouter() - should have one active mediaNode', () => {
			room1.addRouter(router);
			const result = room1.getActiveMediaNodes();

			expect(result.length).toBe(1);
			expect(result[0].id).toBe(mediaNode.id);
		});
	});
});