import { PodcastsService } from './podcasts.service';
import { Repository } from 'typeorm';
import { Podcast } from './entities/podcast.entity';
import { Episode } from './entities/episode.entity';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('PodcastService', () => {
  let service: PodcastsService;
  let podcastRepository: MockRepository<Podcast>;
  let episodeRepository: MockRepository<Episode>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PodcastsService,
        {
          provide: getRepositoryToken(Podcast),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Episode),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<PodcastsService>(PodcastsService);
    podcastRepository = module.get(getRepositoryToken(Podcast));
    episodeRepository = module.get(getRepositoryToken(Episode));
  });

  describe('createPodcast', () => {
    const createPodcastArgs = {
      title: 'test-title',
      category: 'test-category',
    };
    it('should create Podcast', async () => {
      podcastRepository.create.mockReturnValue(createPodcastArgs);
      podcastRepository.save.mockResolvedValue({ id: 1, ...createPodcastArgs });
      const result = await service.createPodcast(createPodcastArgs);

      expect(podcastRepository.create).toHaveBeenCalledTimes(1);
      expect(podcastRepository.create).toHaveBeenCalledWith(createPodcastArgs);
      expect(podcastRepository.save).toHaveBeenCalledTimes(1);
      expect(podcastRepository.save).toHaveBeenCalledWith(createPodcastArgs);

      expect(result).toEqual({ ok: true, id: 1 });
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.create.mockReturnValue(createPodcastArgs);
      podcastRepository.save.mockRejectedValue(new Error());
      const result = await service.createPodcast(createPodcastArgs);

      expect(podcastRepository.create).toHaveBeenCalledTimes(1);
      expect(podcastRepository.create).toHaveBeenCalledWith(createPodcastArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('getAllPodcasts', () => {
    const podcasts = [{ id: 1 }, { id: 2 }];
    it('should get all podcasts', async () => {
      podcastRepository.find.mockResolvedValue(podcasts);

      const result = await service.getAllPodcasts();
      expect(podcastRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true, podcasts });
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.find.mockRejectedValue(new Error());
      const result = await service.getAllPodcasts();
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });
  describe('getPodcast', () => {
    const getPodcastArg = 1;
    const podcast = { id: getPodcastArg };
    it('should get a podcast', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      const result = await service.getPodcast(getPodcastArg);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(podcastRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({ ok: true, podcast });
    });

    it('should fail if podcast is not exist', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.getPodcast(getPodcastArg);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(podcastRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toEqual({
        ok: false,
        error: `Podcast with id ${getPodcastArg} not found`,
      });
    });
    it('should fail if internal server error invoked', async () => {
      podcastRepository.findOne.mockRejectedValue(new Error());
      const result = await service.getPodcast(getPodcastArg);
      // expect(result).toThrowError();
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('updatePodcast', () => {
    let rating: number;
    const updatePodcastArgs = {
      id: 1,
      payload: {
        title: 'new_title',
        category: 'new_category',
        rating,
      },
    };
    const podcast = { id: 1 };
    it('should update podcast', async () => {
      updatePodcastArgs.payload.rating = 3;
      podcastRepository.findOne.mockReturnValue({ id: 1 });
      podcastRepository.save.mockReturnValue({
        ...podcast,
        ...updatePodcastArgs.payload,
      });
      let result = await service.updatePodcast(updatePodcastArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true });

      updatePodcastArgs.payload.rating = null;
      podcastRepository.save.mockReturnValue({
        ...podcast,
        ...updatePodcastArgs.payload,
      });

      result = await service.updatePodcast(updatePodcastArgs);
      expect(result).toEqual({ ok: true });
    });

    it('should fail to update if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = service.updatePodcast(updatePodcastArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(service.getPodcast(podcast.id));
    });

    it('should fail if rating value is not valid', async () => {
      updatePodcastArgs.payload.rating = 6;
      podcastRepository.findOne.mockReturnValue({ id: 1 });

      const result = await service.updatePodcast(updatePodcastArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Rating must be between 1 and 5.',
      });
    });

    it('should fail if internal server error invoked', async () => {
      updatePodcastArgs.payload.rating = 3;
      podcastRepository.findOne.mockReturnValue({ id: 1 });
      podcastRepository.save.mockRejectedValue(new Error());
      const result = await service.updatePodcast(updatePodcastArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('deletePodcast', () => {
    const deletePodcastArgs = 1;
    const podcast = { id: 1 };
    it('should delete podcast', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      const result = await service.deletePodcast(deletePodcastArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true });
    });

    it('should fail if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.deletePodcast(deletePodcastArgs);
      expect(result).toEqual(await service.getPodcast(podcast.id));
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      podcastRepository.delete.mockRejectedValue(new Error());

      const result = await service.deletePodcast(deletePodcastArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(podcastRepository.delete).toHaveBeenCalledTimes(1);
      expect(podcastRepository.delete).toHaveBeenCalledWith(podcast);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('createEpisode', () => {
    const podcast = { id: 1 };
    const createEpisodeArgs = {
      podcastId: 1,
      title: 'episode',
      category: 'category',
    };
    const episode = {
      title: createEpisodeArgs.title,
      category: createEpisodeArgs.category,
    };
    it('should create episode', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      episodeRepository.create.mockReturnValue(episode);
      episodeRepository.save.mockResolvedValue({ id: 1, ...episode, podcast });

      const result = await service.createEpisode(createEpisodeArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(episodeRepository.create).toHaveBeenCalledTimes(1);
      expect(episodeRepository.create).toHaveBeenCalledWith({
        title: createEpisodeArgs.title,
        category: createEpisodeArgs.category,
      });
      expect(episodeRepository.save).toHaveBeenCalledTimes(1);
      expect(episodeRepository.save).toHaveBeenCalledWith({
        ...episode,
        podcast,
      });
      expect(result).toEqual({ ok: true, id: 1 });
    });

    it('should fail if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.createEpisode(createEpisodeArgs);
      expect(result).toEqual(
        await service.getPodcast(createEpisodeArgs.podcastId),
      );
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      episodeRepository.create.mockReturnValue(episode);
      episodeRepository.save.mockRejectedValue(new Error());

      const result = await service.createEpisode(createEpisodeArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(episodeRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });

  describe('getEpisodes', () => {
    const getEpisodesArgs = 1;
    const episodes = [{ id: 1 }, { id: 2 }];
    const podcast = { id: 1, episodes };
    it('should get all episodes', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);

      const result = await service.getEpisodes(getEpisodesArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true, episodes: podcast.episodes });
    });
    it('should fail if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.getEpisodes(getEpisodesArgs);
      expect(result).toEqual(await service.getPodcast(getEpisodesArgs));
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.findOne.mockRejectedValue(new Error());
      const result = await service.getEpisodes(getEpisodesArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });
  describe('getEpisode', () => {
    const getEpisodeArgs = { podcastId: 1, episodeId: 1 };
    const episodes = [{ id: 1 }, { id: 2 }];
    const podcast = { id: 1, episodes };
    it('should get a Episode', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      const result = await service.getEpisode(getEpisodeArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: true,
        episode: episodes.find(o => o.id === getEpisodeArgs.episodeId),
      });
    });

    it('should fail if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.getEpisode(getEpisodeArgs);
      expect(result).toEqual(
        await service.getPodcast(getEpisodeArgs.podcastId),
      );
    });

    it('should fail if  episode is not exists', async () => {
      podcast.episodes = [];
      podcastRepository.findOne.mockResolvedValue(podcast);
      const result = await service.getEpisode(getEpisodeArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: `Episode with id ${getEpisodeArgs.episodeId} not found in podcast with id ${getEpisodeArgs.podcastId}`,
      });
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.findOne.mockRejectedValue(new Error());
      const result = await service.getEpisode(getEpisodeArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });
  describe('deleteEpisode', () => {
    const deleteEpisodeArgs = { podcastId: 1, episodeId: 1 };
    const episodes = [{ id: 1 }, { id: 2 }];
    const podcast = { id: 1, episodes };
    it('should delete episode', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      const result = await service.deleteEpisode(deleteEpisodeArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(episodeRepository.delete).toHaveBeenCalledTimes(1);
      expect(episodeRepository.delete).toHaveBeenCalledWith({
        id: deleteEpisodeArgs.episodeId,
      });
    });

    it('should fail if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.deleteEpisode(deleteEpisodeArgs);
      expect(result).toEqual(
        await service.getPodcast(deleteEpisodeArgs.podcastId),
      );
    });

    it('should fail if episode is not exists', async () => {
      podcast.episodes = [];
      podcastRepository.findOne.mockResolvedValue(podcast);
      const result = await service.deleteEpisode(deleteEpisodeArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(await service.getEpisode(deleteEpisodeArgs));
    });

    it('should fail if internal server error invoked', async () => {
      podcast.episodes = episodes;
      podcastRepository.findOne.mockResolvedValue(podcast);
      episodeRepository.delete.mockRejectedValue(new Error());
      const result = await service.deleteEpisode(deleteEpisodeArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });
  describe('updateEpisode', () => {
    const rest = {
      title: 'new-title',
      category: 'new-category',
    };
    const updateEpisodeArgs = {
      podcastId: 1,
      episodeId: 1,
      ...rest,
    };
    const episode = {
      id: 1,
      title: 'prev-title',
      category: 'prev-category',
    };
    const podcast = {
      id: 1,
      episodes: [episode],
    };

    it('should update episode', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      episodeRepository.save.mockResolvedValue({
        ...episode,
        ...rest,
      });

      const result = await service.updateEpisode(updateEpisodeArgs);
      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(episodeRepository.save).toHaveBeenCalledTimes(1);
      expect(episodeRepository.save).toHaveBeenCalledWith({
        ...episode,
        ...rest,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should fail if podcast not exists', async () => {
      podcastRepository.findOne.mockResolvedValue(undefined);
      const result = await service.updateEpisode(updateEpisodeArgs);
      expect(result).toEqual(
        await service.getPodcast(updateEpisodeArgs.podcastId),
      );
    });

    it('should fail if internal server error invoked', async () => {
      podcastRepository.findOne.mockResolvedValue(podcast);
      episodeRepository.save.mockRejectedValue(new Error());
      const result = await service.updateEpisode(updateEpisodeArgs);

      expect(podcastRepository.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ok: false,
        error: 'Internal server error occurred.',
      });
    });
  });
});
